---
Date: 2026-08-10
Status: Approved
Approved-By: Founder
Supersedes: none
Amends: docs/superpowers/specs/2026-08-08-base44-inspired-golden-path-design.md
Required-Plan: docs/superpowers/plans/2026-08-10-prompt-to-polished-restaurant-product.md
---

# Prompt-to-Polished Restaurant Product Design

## Outcome

Archeform will turn one business brief into a polished, runnable product
before asking the user to understand application architecture.

```text
Requirement
  -> Product Intent + Experience Brief
  -> deterministic Product Recipe and capability selection
  -> mutable Application Graph v2 Draft
  -> immutable Draft Preview Snapshot -> ephemeral dual-surface preview
  -> contextual editing -> new Draft Preview Snapshot
  -> immutable Published Graph
  -> deterministic Compilation
  -> isolated verification
  -> publish or export
```

The first accepted product is a high-end restaurant ordering system with a
customer mobile surface and a merchant desktop surface. It is not a fixed
visual template and it is not a collection of unrelated CRUD pages. The same
Graph coordinates menu, modifiers, pricing, cart, order, inventory, simulated
payment, table, kitchen, identity, permissions, and audit semantics across both
surfaces.

## Product principles

### 1. The default path is product-first

The primary journey is:

```text
Apps -> Describe -> Building / Live Preview -> Edit -> Publish
```

The user sees the emerging product, meaningful progress, and recoverable
questions. They do not see the Application Graph, Composition Plan, capability
lock, database schema, policy engine, build artifacts, or deployment topology
unless they open Advanced or an exception requires a decision.

### 2. Graph authority is preserved through progressive disclosure

Hiding Graph mechanics does not weaken governance:

- AI may propose only schema-valid product and experience semantics.
- The deterministic planner selects an approved recipe and capability versions.
- Editors emit constrained Graph operations against a mutable Draft.
- Publish snapshots one immutable Graph revision.
- Compilers consume only an immutable Published Graph.
- Generated source and runtime state are derived artifacts.
- Diagnostics may propose a reviewable Draft Diff; they never patch immutable
  or running material.

### 3. Clarification is exceptional

The system adopts explicit defaults for non-critical visual and implementation
details. A user-visible clarification is allowed only when the answer changes a
core actor journey, regulated or sensitive data treatment, external side
effect, authorization boundary, or money movement. Restaurant acceptance
permits at most one such clarification.

### 4. Generated products are complete before they are editable

The first preview includes coherent navigation, useful pages, realistic seed
data, domain interactions, responsive behavior, empty/loading/error states,
roles, permissions, and functioning journeys. Before Publish, it renders an
immutable `DraftPreviewSnapshotV1`; it is not a Compilation and cannot be
deployed or exported. Editing is a benefit, not a required repair step.

### 5. Product surfaces are explicit

A customer mobile product and merchant desktop product have different entry
points, navigation, density, device targets, page recipes, and access policy.
They share business truth but are not treated as one responsive CRUD shell.

## Versioned product contracts

All contracts use exact-key validation. Free text is bounded business text.
Identifiers use the existing Graph key grammar. AI output may not contain
package keys, source paths, URLs, providers, runtime destinations, executable
code, credentials, or arbitrary CSS.

### `ProductIntentV1`

`ProductIntentV1` is the model-facing product meaning. It does not select a
recipe or implementation.

```ts
type ProductIntentV1 = {
  apiVersion: "factory.product-intent/v1";
  requirementChecksum: `sha256:${string}`;
  productType: "restaurant-ordering" | "commerce" | "workflow" | "custom";
  title: string;
  businessOutcome: string;
  actors: Array<{
    key: string;
    label: string;
    goals: string[];
  }>;
  coreJourneys: Array<{
    key: string;
    actorKey: string;
    outcome: string;
    critical: boolean;
  }>;
  constraints: {
    regulatedData: boolean;
    externalSideEffects: boolean;
    moneyMovement: "none" | "simulated" | "real";
  };
};
```

For this iteration, `moneyMovement: "real"` fails closed. The accepted
restaurant intent uses simulated payment only.

### `ExperienceBriefV1`

`ExperienceBriefV1` captures desired experience without carrying CSS or
component source.

```ts
type ExperienceBriefV1 = {
  apiVersion: "factory.experience-brief/v1";
  requirementChecksum: `sha256:${string}`;
  surfaces: Array<{
    key: string;
    device: "mobile" | "desktop" | "responsive";
    audience: string[];
    navigation: "bottom-tabs" | "sidebar" | "topbar";
    density: "comfortable" | "compact";
  }>;
  brand: {
    qualities: string[];
    contrast: "soft" | "balanced" | "high";
    imagery: "none" | "supporting" | "image-led";
  };
  theme: {
    defaultMode: "light" | "dark" | "system";
    supportsDark: boolean;
  };
  responsiveTargets: Array<"mobile" | "tablet" | "desktop">;
};
```

The restaurant fixture uses image-led, refined, warm, restrained qualities;
light default; dark retained; comfortable customer density; compact merchant
density.

### `ScreenIntentV1`

`ScreenIntentV1` replaces the narrow assumption that a page is a generic
list/form/detail projection.

```ts
type ScreenIntentV1 = {
  apiVersion: "factory.screen-intent/v1";
  key: string;
  label: string;
  purpose:
    | "discovery"
    | "configuration"
    | "transaction"
    | "tracking"
    | "operations"
    | "fulfillment"
    | "reporting"
    | "administration";
  primaryJourneyKeys: string[];
  entityKeys: string[];
  capabilityKeys: string[];
  recipeKey: string;
  preferredViewport: "mobile" | "desktop" | "responsive";
};
```

`recipeKey` references an approved Archeform page-recipe catalogue. It cannot be
invented by the model.

### `ApplicationSurfaceV1`

```ts
type ApplicationSurfaceV1 = {
  apiVersion: "factory.application-surface/v1";
  key: string;
  label: string;
  kind: "customer" | "merchant" | "operations";
  audienceRoles: string[];
  device: "mobile" | "desktop" | "responsive";
  entryPageKey: string;
  navigation: {
    pattern: "bottom-tabs" | "sidebar" | "topbar";
    items: Array<{ pageKey: string; label: string; icon: string }>;
  };
  responsive: {
    minimumWidth: number;
    maximumContentWidth?: number;
  };
};
```

Every page belongs to exactly one surface. Navigation may target only pages in
that surface. Every role exposed by a surface must exist in PolicyModel.

### `ProductRecipeV1`

`ProductRecipeV1` is deterministic, approved Archeform metadata. The model does
not author or select package versions.

```ts
type ProductRecipeV1 = {
  apiVersion: "factory.product-recipe/v1";
  key: string;
  version: string;
  intentMatchers: Array<{ productType: ProductIntentV1["productType"] }>;
  capabilityLocks: Array<{
    key: string;
    version: string;
    digest: `sha256:${string}`;
  }>;
  surfaces: ApplicationSurfaceV1[];
  screens: ScreenIntentV1[];
  roles: string[];
  flows: string[];
  seedScenarioKeys: string[];
  acceptanceJourneyKeys: string[];
};
```

A recipe is eligible only when its capability locks are approved, compatible,
digest-valid, and verified. Selection is deterministic from validated intent,
not model preference.

### `SourceOverlayV1`

```ts
type SourceOverlayV1 = {
  apiVersion: "factory.source-overlay/v1";
  compilationChecksum: `sha256:${string}`;
  baselineDigest: `sha256:${string}`;
  writableRoots: ["src/extensions"];
  declaredSlots: Array<{
    key: string;
    file: string;
    exportName: string;
  }>;
  files: Array<{
    path: string;
    baseDigest: `sha256:${string}`;
    contentDigest: `sha256:${string}`;
  }>;
  conflictState: "clean" | "stale-baseline" | "slot-removed";
};
```

Overlay content is stored separately from generated files. Recompilation
reapplies only declared slots whose base digest still matches. A conflict never
silently overwrites user content.

### `DraftPreviewSnapshotV1`

`DraftPreviewSnapshotV1` makes pre-Publish preview lifecycle-valid. It binds a
validated Draft revision immutably without pretending that the Draft is a
Published Graph or a Compilation.

```ts
type DraftPreviewSnapshotV1 = {
  apiVersion: "factory.draft-preview-snapshot/v1";
  id: string;
  workspaceId: string;
  applicationGraphId: string;
  draftRevisionId: string;
  graphVersion: "factory.application-graph/v2";
  graphChecksum: `sha256:${string}`;
  snapshotChecksum: `sha256:${string}`;
  disposition: "preview-only";
  state: "ready" | "rendering" | "active" | "disposed" | "expired";
  createdAt: string;
  expiresAt: string;
};
```

The snapshot record binds the exact validated Graph payload through
`draftRevisionId`, `graphVersion`, and `graphChecksum`; the bound payload is
immutable for the snapshot lifetime. `snapshotChecksum` covers every semantic
field except lifecycle timestamps and state. Lifecycle state changes are
append-only events and do not change the bound Graph or checksum.

Allowed transitions are exact:

```text
ready -> rendering | disposed | expired
rendering -> active | disposed | expired
active -> disposed | expired
disposed -> terminal
expired -> terminal
```

The contract is deliberately incapable of carrying a Published Revision ID,
Compilation ID, deploy target, export manifest, source overlay, credential,
provider response, or raw prompt. A disposed, expired, checksum-mismatched, or
non-current snapshot cannot start a preview.

## `factory.application-graph/v2`

Graph v2 retains Domain, Policy, Flow, Integration, and Experience semantics
and adds first-class product surfaces and screen recipes.

```ts
type ApplicationGraphV2 = {
  apiVersion: "factory.application-graph/v2";
  metadata: ApplicationGraphV1["metadata"];
  surfaces: ApplicationSurfaceV1[];
  page: {
    pages: Array<
      ApplicationGraphV1["page"]["pages"][number] & {
        surfaceKey: string;
        screenIntent: ScreenIntentV1;
        recipe: {
          key: string;
          version: string;
          regions: Array<{
            key: string;
            blockIds: string[];
          }>;
        };
      }
    >;
  };
  domain: ApplicationGraphV1["domain"];
  policy: ApplicationGraphV1["policy"];
  flow: ApplicationGraphV1["flow"];
  integration: ApplicationGraphV1["integration"];
  experience: ApplicationGraphV1["experience"] & {
    responsiveNavigation: Array<{
      surfaceKey: string;
      compactAt: number;
      collapse: "drawer" | "tabs" | "none";
    }>;
  };
  seedScenarios: Array<{
    key: string;
    label: string;
    actorKeys: string[];
    records: Array<{ entityKey: string; values: Record<string, unknown> }>;
  }>;
};
```

### Graph v2 invariants

- Surface, page, entity, role, flow, provider, capability, and scenario keys
  are unique.
- Every page references one declared surface and one approved page recipe.
- Recipe regions reference each page block exactly once; a block cannot escape
  its page.
- Navigation targets only pages on the same surface.
- Screen entities, capabilities, and journeys resolve in the Graph.
- Customer and merchant surfaces share business entities; the compiler may not
  create shadow domain models per surface.
- Server-derived totals, order state, payment state, inventory movement, and
  audit are not client-authoritative.
- Every flow transition has an actor grant and a reachable journey.
- Every seed record resolves required references and uses valid temporal values.
- Hashing canonicalizes object keys while retaining meaningful array order.
- Published V1 or V2 content and hashes are immutable.

### V1 preservation and upgrade

- Existing `factory.application-graph/v1` parsing, hashing, and published
  revisions remain unchanged.
- `upgradeApplicationGraphV1ToV2Draft` accepts a validated V1 Graph and an
  explicit upgrade context, then creates a new V2 Draft revision with a new
  hash. It never updates the V1 Published Revision.
- New projects use V2 only.
- The compiler entry accepts a discriminated `ApplicationGraphV1 |
ApplicationGraphV2` and routes through `adaptApplicationGraphV1` or
  `adaptApplicationGraphV2`. No optional field or implicit default is used to
  guess a version.

## Draft preview lifecycle

Pre-Publish preview and production compilation are separate lifecycle lanes:

```text
Draft revision
  -> create immutable Draft Preview Snapshot
  -> render ephemeral surface documents
  -> start preview runtime
  -> active preview
  -> dispose or expire

Draft revision
  -> Publish validation
  -> immutable Published Revision
  -> production Compilation
  -> isolated verification
  -> deploy/export eligible artifacts
```

Rules:

- `packages/graph` owns the snapshot schema, checksum, and transition
  validation.
- Control Plane owns snapshot creation, append-only lifecycle events, expiry,
  current-Draft comparison, and disposal.
- The platform preview renderer may reuse pure rendering logic but accepts only
  a valid `DraftPreviewSnapshotV1` and emits preview-only surface documents.
- Preview rendering never creates a `Compilation`, deployable image, export
  manifest, ZIP, Git commit, source overlay, or production artifact record.
- Production compiler entry points continue to accept only immutable Published
  V1/V2 Graph inputs.
- Publish validates the current Draft independently. A preview snapshot is never
  promoted, converted, or reused as the Published Revision.
- Editing appends a new Draft revision. The active snapshot remains immutable
  and becomes stale relative to the Draft; Workbench creates a new snapshot
  before showing the edited preview.
- Preview snapshot creation, render, activation, disposal, expiry, stale-Draft
  rejection, checksum rejection, deploy rejection, and export rejection are
  test-pinned transitions.

## Deep Commerce Module

The restaurant product is composed over reusable commerce semantics.

### Shared capabilities

- Catalog: products, categories, images, descriptive content, availability.
- Modifiers: option groups, required/optional choices, min/max selections,
  additive pricing.
- Pricing: money stored in minor units, currency, server-derived totals, and
  immutable order-line snapshots.
- Cart: session ownership, line configuration, quantity, validation, and
  recalculation.
- Order transaction: atomic cart-to-order conversion, idempotency key,
  inventory movement, and audit event.
- Simulated payment: intent, authorized/failed/cancelled state, receipt, and no
  real external money movement.
- Identity and policy: principal, role assignment, row/action visibility, and
  denial evidence.

### Restaurant extensions

- Table session and guest association.
- Table layout, capacity, availability, reservation, and occupancy state.
- Time- and stock-aware menu availability.
- Merchant order intake and priority.
- Kitchen queue with accepted -> preparing -> ready transitions.
- Dining fulfillment with served and completed states.
- Restaurant dashboard and operational reporting derived from transactions.

### Customer mobile surface

At minimum:

1. Home — brand, featured collections, current service state, and quick entry.
2. Menu — category navigation, image-led cards, price and availability.
3. Dish Detail — description, modifier selection, validation, quantity, add.
4. Cart — configured lines, edit/remove, server totals, checkout readiness.
5. Checkout — table or pickup context, simulated payment, confirmation.
6. Orders — active and previous orders.
7. Order Detail — receipt and fulfillment timeline.
8. Profile — identity and preferences; may share the order-detail navigation
   slot but remains a distinct page when generated.

The default navigation is bottom tabs. The experience must fit a phone viewport
without exposing merchant navigation or Graph mechanics.

### Merchant desktop surface

At minimum:

1. Dashboard — revenue, active orders, table occupancy, menu state.
2. Menu Management — categories, items, modifiers, price, availability.
3. Orders — filterable transaction queue and detail.
4. Kitchen Queue — operational tickets grouped by stage and age.
5. Tables — visual table map and status operations.
6. Users/Roles — members, role assignment, visibility, permission matrix.
7. Settings — restaurant identity, service rules, tax/display preferences.

The eight customer screens and seven merchant screens are fifteen distinct,
surface-owned screens. A screen with the same label on both surfaces, such as
Orders, has a distinct page key, route, recipe, navigation membership, and
audience policy.

The default navigation is a compact sidebar. Dashboard and operations pages
use business-specific blocks rather than generic table/form wrappers.

## Page recipes and UI source topology

```text
packages/ui-primitives
  pinned shadcn/ui Radix source, Lucide wrappers, tokens, accessibility states

packages/ui-patterns
  composable navigation, form, feedback, data-display, command, and layout patterns

packages/workbench-ui
  Archeform Workspace Home, Builder Workspace, App Management, and Advanced UI

packages/generated-ui
  source-owned mobile/desktop shells and reusable domain business blocks

packages/screen-recipes
  validated multi-region screen trees, bindings, variants, and responsive rules

packages/experience-recipes
  Fine Dining and future visual/interaction systems

packages/product-recipes
  versioned product assembly descriptors referencing screens and capabilities
```

The layers have distinct responsibilities:

- primitives own the smallest accessible source components;
- patterns compose primitives into reusable interaction structures without
  domain meaning;
- `workbench-ui` and `generated-ui` own product-specific presentation and
  behavior for the Archeform console and generated applications respectively;
- screen recipes declare complete page composition without embedding arbitrary
  source;
- experience recipes supply compatible tokens, typography, density, motion,
  and responsive rules;
- product recipes bind approved capabilities, surfaces, screens, roles, seed
  scenarios, and acceptance journeys.

Each registered primitive, pattern, block, screen, experience, or product
recipe declares a stable key and version, owned source and license provenance,
input schema, named slots and allowed nesting, Domain/Flow/Policy bindings,
loading/empty/error/success/denied states, responsive variants, required tokens,
accessibility evidence, fixtures, interaction tests, and screenshot tests. AI
may select a compatible recipe and fill validated parameters; it may not invent
source paths, omit required states, or bypass registry dependency resolution.

Initial generated business blocks include:

- `MobileProductShell`, `MerchantWorkspaceShell`;
- `MenuHero`, `CategoryRail`, `MenuItemCard`, `DishConfigurator`;
- `CartLine`, `OrderSummary`, `PaymentState`, `OrderTimeline`;
- `MetricCard`, `ActiveOrderList`, `KitchenTicket`, `TableMap`;
- `MenuManagementTable`, `AvailabilityToggle`, `RoleMatrix`;
- loading, empty, validation, error, confirmation, and denial states.

Puck edits complete page trees made of approved blocks. A page recipe declares
regions, required blocks, optional blocks, allowed nesting, bindings, variants,
and responsive constraints. Puck editor data is adapter state; validated block
structure and bindings are Graph data.

The compiler copies selected generated UI source, primitive source, tokens,
and license notices into the standalone generated project. It does not import
private monorepo runtime packages.

## Archeform identity and stable implementation names

The root README is the active brand authority: the public product is
**Archeform · 元象**, with the positioning line “The source form of software.”
Workbench copy, browser metadata, active documentation, icons, and future
public assets use Archeform. Generated applications use their own product
identity and Experience Recipe; they do not inherit the Archeform brand unless
the application owner explicitly selects it.

This iteration does not rename the Git remote, filesystem layout, `@factory/*`
packages, `factory.application-graph/v1|v2` serialized identifiers, historical
documents, evidence records, or immutable hashes. Those names are technical
compatibility boundaries, not public branding. A later internal namespace
migration must be explicit, versioned, and tested; it cannot be a repository
search-and-replace.

Acceptance requires that active user-facing Workbench surfaces and metadata no
longer display `Factory Pilot`. Historical, legal, source-study, protocol, and
package-identifier occurrences remain truthful and are not rewritten.

## Workbench source decomposition

The current 3,818-line `apps/workbench/app/globals.css`, 907-line
`apps/workbench/hooks/use-workbench-controller.ts`, and 1,131-line
`apps/workbench/lib/control-plane-client.ts` are migration sources, not places
to accumulate the new journey.

The target style boundary is:

```text
apps/workbench/styles/
  tokens.css
  base.css
  utilities.css
  workspace-home.css
  builder-workspace.css
  app-management.css

apps/workbench/components/**
  *.module.css
```

`globals.css` becomes an import/reset boundary. Feature styling is colocated or
owned by one stable product context; selectors may not rely on incidental DOM
nesting in another context.

The target orchestration boundary is:

```text
apps/workbench/hooks/workspace/use-workspace-home-controller.ts
apps/workbench/hooks/builder/use-builder-controller.ts
apps/workbench/hooks/management/use-app-management-controller.ts
apps/workbench/hooks/release/use-release-controller.ts
apps/workbench/state/workbench-shell-machine.ts

apps/workbench/lib/control-plane/applications-client.ts
apps/workbench/lib/control-plane/drafts-client.ts
apps/workbench/lib/control-plane/previews-client.ts
apps/workbench/lib/control-plane/releases-client.ts
apps/workbench/lib/control-plane/templates-client.ts
```

Characterization tests lock existing behavior before extraction. New UI source
targets at most 250 lines per file and is reviewed for decomposition above 350
lines; controllers and clients target at most 300 lines per responsibility;
feature CSS targets at most 300 lines per file; `globals.css` targets at most
150 lines of imports, reset, and root tokens. These are review thresholds, not
an excuse for meaningless file fragmentation: any exception must document the
single responsibility that requires it.

## Experience systems

### Workbench

- warm neutral background;
- one restrained accent color;
- fine dividers, 8–12px radii, and minimal elevation;
- compact icon-led navigation with Lucide;
- short labels and one concise contextual sentence at most;
- light default, fully functional dark mode;
- 140–200ms state transitions and reduced-motion support.

### Fine Dining generated product

- warm cream and parchment surfaces;
- deep charcoal or brown navigation;
- restrained brass/gold accent with accessible contrast;
- editorial serif display type paired with a quiet sans-serif UI face;
- generous customer whitespace and image-led menu content;
- compact merchant information density;
- no decorative animation that delays a transaction;
- independent light and dark token sets.

The Workbench theme never leaks into generated product tokens.

## Workbench information architecture

The Archeform Workbench uses three stable application contexts. This organization is
informed by public product-builder patterns, including Base44's documented
chat/preview/dashboard separation, but is independently implemented and does
not copy Base44 source, assets, tokens, prompts, or brand.

```text
Workspace Home
  Apps | Describe | Templates | Resume

Builder Workspace
  Conversation | Live Preview | Visual Edit | Publish

App Management
  Overview | Data | Users | Workflows | Integrations | Security | Code | Logs | Settings
```

The current context must be visually obvious. Workspace navigation never
competes with application navigation, and management navigation never appears
inside a generated-product preview.

### Apps

Shows application cards, status, last preview, the primary Describe input, and
a `Start from a template` entry. The user may create from a prompt, instantiate
a curated first-party template, or resume an application.

The Templates view supports category filters, search, preview images, template
version, included surfaces, and a concise capability summary. Instantiation
copies a versioned Published Graph/Recipe baseline into a new independent
Draft workspace, creates seed scenarios and a Draft Preview Snapshot, and
retains origin/version metadata. It does not copy secrets or provider accounts,
and later template updates never mutate an existing application.

### Building / Live Preview

Chat activity and safe progress appear beside or over the live preview. Status
uses product language such as “Creating menu and order flow” rather than
package/compiler terminology. Required clarification pauses one bounded step;
non-critical defaults continue automatically.

Every pre-Publish preview displays the Draft revision and immutable Draft
Preview Snapshot it represents. A Draft edit marks that preview stale until a
new snapshot is ready. The UI never labels a Draft preview as published,
deployed, exportable, or production-ready.

### Edit

Application-context navigation exposes:

- Page — Puck canvas, page tree, routes, responsive preview, block properties;
- Data — business entities, fields, relationships, records, and validation;
- Users — members, roles, visibility, and permission matrix;
- Workflows — business states, transitions, guards, and effects;
- Experience — brand, tokens, navigation, density, variants, and responsive
  behavior;
- Code — complete generated file tree, source origin, search, diff, ZIP, Git;
- Advanced — Graph, capability locks, evidence, lineage, raw schemas, and
  diagnostics.

Selecting a page synchronizes Preview, Puck selection, entity bindings,
relevant workflow, and generated source files. A Data, Users, Workflow, or
Experience edit creates a new mutable Draft revision; Publish and Compilation
remain explicit.

### App Management

App Management is an application-scoped operating surface, not another build
step. Its first accepted navigation contains only backed capabilities:

- Overview — revision, preview, publish state, recent safe activity, and next
  action;
- Data — business entities, records, relationships, seed/test scenarios, and
  access summaries;
- Users — members, roles, visibility, and permission matrix;
- Workflows — business states, transitions, triggers, effects, and run history;
- Integrations — configured capability providers and missing setup, without
  exposing credentials;
- Security — visibility, role coverage, denial checks, and bounded scan results;
- Code — source tree, origins, search, diff, ZIP, Git, and controlled overlays;
- Logs — redacted build, preview, workflow, and runtime events;
- Settings — application identity, experience defaults, template origin, and
  lifecycle actions.

Analytics, Marketing/SEO, Domains, Agents, MCP, cloud operations, and Fleet are
not rendered as inactive navigation. They are added only when their contracts,
providers, permissions, empty/error states, and tests exist.

### Publish

Publish validates and snapshots the Draft. Compilation, isolated verification,
preview, and cleanup report concise progress. Detailed evidence opens only on
demand. Failure provides a bounded reason and safe next action.

## Source Mode

Source Mode displays all generated files and origin metadata:

- Graph revision and compiler target that produced the file;
- originating surface, screen recipe, and UI registry item;
- current and previous generated digest;
- generated-file diff and search;
- ZIP manifest and Git export state.

Generated files are read-only in this iteration. Writable content is limited
to `src/extensions/**` and declared extension exports. Arbitrary package
installation, server scripts, SQL, credential files, and Graph reverse parsing
remain prohibited.

## Safety and privacy

- Real-model keys enter only through the local process environment.
- Raw prompts, responses, hidden reasoning, credentials, and sensitive request
  bodies never enter Graph state, logs, evidence, screenshots, exports, or
  generated source.
- AI never selects packages, paths, URLs, providers, runtime destinations, or
  executable code.
- Server code owns totals, authorization, transitions, idempotency, inventory,
  payment state, and audit.
- Generated applications fail closed on missing capability locks, invalid
  digests, unresolved bindings, ungranted transitions, or unsafe overlays.
- Payments are simulated and clearly labelled.

## Acceptance gates

### Contract

- All six new interfaces and Graph v2 have strict schemas, semantic validation,
  stable hashing, and public exports.
- V1 parsing and hashes remain unchanged.
- V1-to-V2 upgrade creates a new Draft and does not mutate a Published V1
  revision.
- Compiler version adapters are explicit and covered by parity tests.

### Product

- One restaurant prompt produces customer mobile and merchant desktop surfaces
  with at least fifteen meaningful pages and multi-block page trees.
- Required customer screens are Home, Menu, Dish Detail, Cart, Checkout,
  Orders, Order Detail, and Profile. Required merchant screens are Dashboard,
  Menu Management, Orders, Kitchen Queue, Tables, Users/Roles, and Settings.
- The default product is usable without manual Graph, database, or backend
  configuration.
- Customer: browse -> configure -> cart -> simulated payment -> track order.
- Merchant: change availability -> receive order -> kitchen transitions ->
  table/order view -> audit.
- Both surfaces share entities, transactions, roles, workflow, and evidence.

### Editing and source

- Active Workbench identity, browser metadata, and product copy use
  Archeform · 元象; generated products keep their own Experience identity;
  stable internal protocol/package names remain unchanged.
- Registry contracts cover primitives, patterns, Workbench/generated blocks,
  screen recipes, experience recipes, and product recipes, including source,
  schema, nesting, bindings, complete states, responsive behavior,
  accessibility, fixtures, and provenance.
- Puck round-trips page trees and responsive settings.
- Data, Users, Workflow, and Experience edits create a new Draft and can be
  republished and recompiled.
- Source Mode locates the file for a selected page, shows provenance and diff,
  and exports deterministic ZIP/Git manifests.
- Only declared overlay paths are writable; conflicts fail visibly.
- Characterization tests preserve current behavior while the global stylesheet,
  Workbench controller, and Control Plane client are split along the specified
  context/responsibility boundaries and pass their size-review gates.

### Quality and runtime

- Deterministic fixture input produces identical Graph, file set, and digests.
- Pre-Publish preview renders only an immutable Draft Preview Snapshot; snapshot
  lifecycle, staleness, checksum, expiry, disposal, deployment rejection, and
  export rejection tests pass.
- Production compilers continue to consume only a Published Graph, and Publish
  never promotes a preview snapshot.
- Mobile/desktop, light/dark, keyboard, responsive, and axe checks pass.
- Generated migration, health, role journeys, denial, idempotency, audit,
  preview, and cleanup pass from a clean checkout.
- Final acceptance uses one guarded real-model run, at most one user-visible
  critical clarification, and completes within 30 minutes.
- No residual container, network, volume, preview directory, credential, or raw
  model material remains.

## Deferred decisions

- unrestricted source editing and a permanent code-fork lifecycle;
- real payments and external payment providers;
- Figma import/export contract;
- Stitch adapter or runtime use;
- production Aceternity candidates;
- broad Profile/capability expansion;
- cloud delivery, fleet, observability, and managed operations.
